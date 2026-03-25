import { Config } from "effect"

export const USER = Config.string("USER")
export const HOME = Config.string("HOME")
export const DOTFILES = Config.string("DOTFILES")
export const XDG_CONFIG_HOME = Config.string("XDG_CONFIG_HOME")
export const XDG_CACHE_HOME = Config.string("XDG_CACHE_HOME")
export const XDG_DATA_HOME = Config.string("XDG_DATA_HOME")
export const XDG_BIN_HOME = Config.string("XDG_BIN_HOME")
